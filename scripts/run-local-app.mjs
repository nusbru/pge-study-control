#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { constants } from 'node:os';
import process from 'node:process';

const SIGNAL_STATUSES = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};
const GROUP_STOP_WAIT_MS = 1000;
const POLL_INTERVAL_MS = 25;

let groupPid;
let receivedSignal;
let terminateTimer;
let killTimer;

function signalGroup(signal) {
  if (groupPid === undefined) {
    return;
  }
  try {
    process.kill(-groupPid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') {
      throw error;
    }
  }
}

function groupExists() {
  try {
    process.kill(-groupPid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

function scheduleEscalation() {
  if (terminateTimer !== undefined) {
    return;
  }
  terminateTimer = setTimeout(() => signalGroup('SIGTERM'), GROUP_STOP_WAIT_MS);
  killTimer = setTimeout(() => signalGroup('SIGKILL'), GROUP_STOP_WAIT_MS * 2);
}

function relaySignal(signal) {
  receivedSignal ??= signal;
  if (groupPid !== undefined) {
    signalGroup(signal);
    scheduleEscalation();
  }
}

for (const signal of Object.keys(SIGNAL_STATUSES)) {
  process.on(signal, () => relaySignal(signal));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForGroupExit() {
  for (let elapsed = 0; elapsed < GROUP_STOP_WAIT_MS; elapsed += POLL_INTERVAL_MS) {
    if (!groupExists()) {
      return true;
    }
    await delay(POLL_INTERVAL_MS);
  }
  return !groupExists();
}

async function stopRemainingGroup() {
  clearTimeout(terminateTimer);
  clearTimeout(killTimer);
  if (!groupExists()) {
    return;
  }
  signalGroup('SIGTERM');
  if (await waitForGroupExit()) {
    return;
  }
  signalGroup('SIGKILL');
  if (!(await waitForGroupExit())) {
    throw new Error(`application process group ${groupPid} did not stop`);
  }
}

async function main() {
  if (process.platform === 'win32') {
    throw new Error('local runtime process-group supervision requires a POSIX platform');
  }

  const child = spawn('npm', ['run', 'dev', '--', '--port', process.env.APP_PORT], {
    detached: true,
    env: process.env,
    stdio: 'inherit',
  });
  groupPid = child.pid;
  if (groupPid === undefined || !groupExists()) {
    child.kill('SIGTERM');
    throw new Error('failed to create the application process group');
  }
  if (receivedSignal !== undefined) {
    signalGroup(receivedSignal);
    scheduleEscalation();
  }

  const outcome = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status, signal) => resolve({ signal, status }));
  });
  await stopRemainingGroup();

  if (receivedSignal !== undefined) {
    process.exitCode = SIGNAL_STATUSES[receivedSignal];
  } else if (outcome.status !== null) {
    process.exitCode = outcome.status;
  } else {
    process.exitCode = 128 + constants.signals[outcome.signal];
  }
}

main().catch((error) => {
  console.error(`local app supervisor: ${error.message}`);
  process.exitCode = 1;
});
