import React from "react";

type FloatingButtonProps = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
};

const FloatingButton: React.FC<FloatingButtonProps> = ({ label, onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className="
        fixed
        lg:hidden
        top-1/2
        right-0
        -translate-y-1/2
        bg-blue-500
        text-white
        px-3
        py-6
        rounded-l-xl
        shadow-lg
        z-40
        hover:px-4
        transition-all
      "
    >
      {icon && <span>{icon}</span>}
      <span className="ml-2">{label}</span>
    </button>
  );
};

export default FloatingButton;
