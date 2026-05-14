/**
 * Binary switch primitive (`nx-toggle`). Used for quick session controls
 * (pause questions, lock session, follow instructor in the student portal).
 */

interface NxToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function NxToggle({ on, onChange, disabled, ariaLabel }: NxToggleProps) {
  return (
    <button
      type="button"
      className="nx-toggle"
      data-on={on ? "true" : "false"}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    />
  );
}
