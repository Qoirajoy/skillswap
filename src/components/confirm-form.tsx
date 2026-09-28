"use client";

export function ConfirmForm({
  action,
  message,
  id,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  id: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm font-medium text-request">
        {label}
      </button>
    </form>
  );
}
