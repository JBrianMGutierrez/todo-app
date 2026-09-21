// src/components/mobile/floating/AddTaskFloatingButton.tsx

import React from "react";
import { PlusCircle } from "lucide-react";

type AddTaskFloatingButtonProps = {
  onClick: () => void;
};

const AddTaskFloatingButton: React.FC<AddTaskFloatingButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        fixed
        lg:hidden
        top-1/2
        left-0
        -translate-y-1/2
        bg-blue-500
        text-white
        px-3
        py-6
        rounded-r-xl
        shadow-lg
        z-40
        hover:px-4
        transition-all
      "
    >
      <PlusCircle size={18} className="mr-2 inline" />
      <span>Task</span>
    </button>
  );
};

export default AddTaskFloatingButton;
