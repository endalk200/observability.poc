import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, error, hint, className = "", id, ...props }, ref) => {
		const inputId = id || props.name;

		return (
			<div className="w-full">
				{label && (
					<label
						className="mb-1.5 block font-medium text-gray-700 text-sm"
						htmlFor={inputId}
					>
						{label}
					</label>
				)}
				<input
					className={`block w-full rounded-lg border px-4 py-2.5 text-gray-900 shadow-sm transition-colors duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
						error
							? "border-red-300 focus:border-red-500 focus:ring-red-500"
							: "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
					} ${className}`}
					id={inputId}
					ref={ref}
					{...props}
				/>
				{hint && !error && (
					<p className="mt-1.5 text-gray-500 text-sm">{hint}</p>
				)}
				{error && <p className="mt-1.5 text-red-600 text-sm">{error}</p>}
			</div>
		);
	},
);

Input.displayName = "Input";
