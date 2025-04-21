const Logo = () => {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#046C44" />
      <path
        d="M8 14H32V16H8V14ZM8 19H32V21H8V19ZM8 24H32V26H8V24Z"
        fill="white"
      />
      <rect
        x="12"
        y="8"
        width="16"
        height="24"
        rx="2"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M16 30L24 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 30L16 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Logo;
