# Dashboard Filter Layout Design

## Goal

Display the `Periodo` and `Tipo de questao` filter groups on the same horizontal line at desktop widths without changing their behavior or accessibility.

## Layout

- Keep the existing dashboard markup and filter controls.
- Change `.filterControls` to arrange its two filter groups in a row on screens wider than `44rem`.
- Use spacing between the filter groups while allowing each option list to wrap when needed.
- Preserve the existing date placement at the opposite side of the filter row.
- At the existing `44rem` breakpoint, stack the filter groups vertically and retain the current mobile layout.

## Behavior And Accessibility

Filter links, query parameters, labels, focus styles, and selected-state semantics remain unchanged.

## Verification

- Add an end-to-end responsive assertion that the filter headings share a row on desktop.
- Assert that the headings stack vertically on mobile.
- Run the focused responsive test and static checks.
