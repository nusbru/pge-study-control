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

let groupOwnership;
let receivedSignal;
let terminateTimer;
let killTimer;

function ownsGroup(ownership) {
  return ownership !== undefined && groupOwnership === ownership;
}

function signalGroup(ownership, signal) {
  if (!ownsGroup(ownership)) {
    return;
  }
  try {
    process.kill(-ownership.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') {
      throw error;
    }
  }
}

function groupExists(ownership) {
  if (!ownsGroup(ownership)) {
    return false;
  }
  try {
    process.kill(-ownership.pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

function clearEscalationTimers() {
  clearTimeout(terminateTimer);
  clearTimeout(killTimer);
  terminateTimer = undefined;
  killTimer = undefined;
}

function finalizeGroup(ownership) {
  if (!ownsGroup(ownership)) {
    return;
  }
  groupOwnership = undefined;
  clearEscalationTimers();
}

function scheduleEscalation(ownership) {
  if (!ownsGroup(ownership) || terminateTimer !== undefined) {
    return;
  }
  terminateTimer = setTimeout(() => signalGroup(ownership, 'SIGTERM'), GROUP_STOP_WAIT_MS);
  killTimer = setTimeout(() => signalGroup(ownership, 'SIGKILL'), GROUP_STOP_WAIT_MS * 2);
}

function relaySignal(signal) {
  receivedSignal ??= signal;
  const ownership = groupOwnership;
  if (ownership !== undefined) {
    signalGroup(ownership, signal);
    scheduleEscalation(ownership);
  }
}

for (const signal of Object.keys(SIGNAL_STATUSES)) {
  process.on(signal, () => relaySignal(signal));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForGroupExit(ownership) {
  for (let elapsed = 0; elapsed < GROUP_STOP_WAIT_MS; elapsed += POLL_INTERVAL_MS) {
    if (!groupExists(ownership)) {
      return true;
    }
    await delay(POLL_INTERVAL_MS);
  }
  return !groupExists(ownership);
}

async function stopRemainingGroup(ownership) {
  clearEscalationTimers();
  try {
    if (!groupExists(ownership)) {
      return;
    }
    signalGroup(ownership, 'SIGTERM');
    if (await waitForGroupExit(ownership)) {
      return;
    }
    signalGroup(ownership, 'SIGKILL');
    if (!(await waitForGroupExit(ownership))) {
      throw new Error(`application process group ${ownership.pid} did not stop`);
    }
  } finally {
    finalizeGroup(ownership);
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
  const ownership = child.pid === undefined ? undefined : { pid: child.pid };
  groupOwnership = ownership;
  if (ownership === undefined || !groupExists(ownership)) {
    child.kill('SIGTERM');
    finalizeGroup(ownership);
    throw new Error('failed to create the application process group');
  }
  if (receivedSignal !== undefined) {
    signalGroup(ownership, receivedSignal);
    scheduleEscalation(ownership);
  }

  const outcome = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status, signal) => resolve({ signal, status }));
  });
  await stopRemainingGroup(ownership);

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
