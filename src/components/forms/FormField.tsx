"use client";

import * as React from "react";
import { useFormContext, Controller, FieldError } from "react-hook-form";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "number" | "password" | "textarea" | "select" | "checkbox" | "multi-checkbox";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  tooltip?: string;
  className?: string;
  inputClassName?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  min?: number;
  max?: number | string;
}

export function FormField({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  options = [],
  tooltip,
  className,
  inputClassName,
  onChange,
  maxLength,
  min,
  max,
}: FormFieldProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  // Get nested error
  const getNestedError = (name: string): FieldError | undefined => {
    const parts = name.split(".");
    let current: Record<string, unknown> = errors;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part] as Record<string, unknown>;
      } else {
        return undefined;
      }
    }
    return current as unknown as FieldError;
  };

  const error = getNestedError(name);

  const errorId = useId();

  const renderLabel = () => (
    <div className="flex items-center gap-1.5">
      <Label
        htmlFor={name}
        className={cn("text-sm font-medium", error && "text-destructive")}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                tabIndex={0}
                aria-label="More info"
                className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
              >
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const renderError = () =>
    error && (
      <p
        id={errorId}
        role="alert"
        className="text-sm text-destructive mt-1"
      >
        {error.message?.toString()}
      </p>
    );

  const describedByProps = error ? { "aria-describedby": errorId } : {};
  const invalidProps = error ? { "aria-invalid": true as const } : {};

  if (type === "textarea") {
    return (
      <div className={cn("space-y-2", className)}>
        {renderLabel()}
        <Textarea
          id={name}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(error && "border-destructive", inputClassName)}
          {...invalidProps}
          {...describedByProps}
          {...register(name)}
        />
        {renderError()}
      </div>
    );
  }

  if (type === "select") {
    return (
      <div className={cn("space-y-2", className)}>
        {renderLabel()}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || ""}
              onValueChange={(value) => {
                field.onChange(value);
                onChange?.(value);
              }}
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(error && "border-destructive", inputClassName)}
                {...invalidProps}
                {...describedByProps}
              >
                <SelectValue placeholder={placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {renderError()}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Checkbox
              id={name}
              checked={field.value || false}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          )}
        />
        <Label htmlFor={name} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="More info"
                  className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
                >
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  if (type === "multi-checkbox") {
    return (
      <div className={cn("space-y-3", className)}>
        {renderLabel()}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${name}-${option.value}`}
                    checked={(field.value || []).includes(option.value)}
                    onCheckedChange={(checked) => {
                      const currentValue = field.value || [];
                      if (checked) {
                        field.onChange([...currentValue, option.value]);
                      } else {
                        field.onChange(
                          currentValue.filter((v: string) => v !== option.value)
                        );
                      }
                    }}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`${name}-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          )}
        />
        {renderError()}
      </div>
    );
  }

  // Handler to block non-numeric input for number fields
  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if (["Backspace", "Delete", "Tab", "Escape", "Enter"].includes(e.key)) {
      return;
    }
    // Allow: Ctrl/Cmd + A, C, V, X
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) {
      return;
    }
    // Allow: home, end, left, right, down, up
    if (["Home", "End", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.key)) {
      return;
    }
    // Allow: decimal point (period and numpad decimal)
    if (e.key === "." ) {
      return;
    }
    // Block if not a number (top row or numpad digits)
    if (e.shiftKey || !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {renderLabel()}
      <Input
        id={name}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        max={max}
        onKeyDown={type === "number" ? handleNumberKeyDown : undefined}
        className={cn(error && "border-destructive", inputClassName)}
        {...invalidProps}
        {...describedByProps}
        {...register(name, {
          setValueAs: type === "number"
            ? (v: string | number | null | undefined) => {
                if (v === "" || v === undefined || v === null) return null;
                const num = Number(v);
                return Number.isNaN(num) ? null : num;
              }
            : undefined,
        })}
      />
      {renderError()}
    </div>
  );
}