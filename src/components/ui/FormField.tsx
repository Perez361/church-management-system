import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, error, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-semibold text-[#9490A8] uppercase tracking-wider">
        {label}
        {required && <span className="text-amber-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400 mt-0.5">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function Input({ hasError, className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-[#211D30] border rounded-xl px-3.5 py-2.5 text-sm text-white",
        "placeholder-[#9490A8]/50 outline-none transition-colors",
        hasError
          ? "border-rose-400/50 focus:border-rose-400"
          : "border-[#2E2840] focus:border-amber-400/50",
        className
      )}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ hasError, options, placeholder, className, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={cn(
        "w-full bg-[#211D30] border rounded-xl px-3.5 py-2.5 text-sm text-white",
        "outline-none transition-colors cursor-pointer",
        hasError
          ? "border-rose-400/50 focus:border-rose-400"
          : "border-[#2E2840] focus:border-amber-400/50",
        className
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export function Textarea({ hasError, className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      rows={3}
      className={cn(
        "w-full bg-[#211D30] border rounded-xl px-3.5 py-2.5 text-sm text-white",
        "placeholder-[#9490A8]/50 outline-none transition-colors resize-none",
        hasError
          ? "border-rose-400/50 focus:border-rose-400"
          : "border-[#2E2840] focus:border-amber-400/50",
        className
      )}
    />
  );
}