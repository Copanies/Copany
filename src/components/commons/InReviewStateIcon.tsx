interface InReviewStateIconProps {
  className?: string;
}

export default function InReviewStateIcon({
  className,
}: InReviewStateIconProps) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="10.5"
        cy="11"
        r="7"
        stroke="#7B00FF"
        style={{
          stroke: "color(display-p3 0.4833 0.0000 1.0000)",
          strokeOpacity: 1,
        }}
        strokeWidth="2"
      />
      <path
        d="M10.5 7C12.7091 7 14.5 8.79086 14.5 11C14.5 13.2091 12.7091 15 10.5 15C8.29086 15 6.5 13.2091 6.5 11H10.5V7Z"
        fill="#7B00FF"
        style={{
          fill: "color(display-p3 0.4833 0.0000 1.0000)",
          fillOpacity: 1,
        }}
      />
    </svg>
  );
}
