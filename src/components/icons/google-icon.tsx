import type { SVGProps } from 'react';

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
        <path d="M21.35 11.1H12.18v2.8h5.04c-.25 1.68-1.69 4.12-5.04 4.12-3.03 0-5.49-2.49-5.49-5.52s2.46-5.52 5.49-5.52c1.75 0 2.77.73 3.43 1.35l2.1-2.1c-1.27-1.19-2.98-1.9-4.93-1.9-4.06 0-7.38 3.28-7.38 7.32s3.32 7.32 7.38 7.32c4.33 0 6.94-2.95 6.94-7.08 0-.52-.04-.94-.12-1.32z"/>
    </svg>
  );
}
