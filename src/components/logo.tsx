import * as React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M15.5 25.5V19.5M15.5 19.5L11.25 15M15.5 19.5L20 16.25M15.5 16L14 10.25M15.5 16L9 12.5M15.5 16L22.5 11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.25 26.75C13.3546 26.75 14.25 25.8546 14.25 24.75C14.25 23.6454 13.3546 22.75 12.25 22.75C11.1454 22.75 10.25 23.6454 10.25 24.75C10.25 25.8546 11.1454 26.75 12.25 26.75Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M18.75 27.25C20.2688 27.25 21.5 26.0188 21.5 24.5C21.5 22.9812 20.2688 21.75 18.75 21.75C17.2312 21.75 16 22.9812 16 24.5C16 26.0188 17.2312 27.25 18.75 27.25Z"
        fill="currentColor"
        opacity="0.1"
      />
      <g stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
        <path d="M8.5 12.5V10.9" />
        <path d="M7.7 11.7H9.3" />
        <path d="M13.9 10.15V8.55" />
        <path d="M13.1 9.35H14.7" />
        <path d="M22.5 11V9.4" />
        <path d="M21.7 10.2H23.3" />
        <path d="M11.25 15V13.4" />
        <path d="M10.45 14.2H12.05" />
        <path d="M20 16.25V14.65" />
        <path d="M19.2 15.45H20.8" />
      </g>
      <circle cx="8.5" cy="12.5" r="2.1" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <circle cx="14" cy="10.15" r="2.1" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <circle cx="22.5" cy="11" r="2.1" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <circle cx="11.25" cy="15" r="2.1" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <circle cx="20" cy="16.25" r="2.1" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <circle cx="15.5" cy="19.5" r="1.65" fill="currentColor" opacity="0.14" />
    </svg>
  );
}
