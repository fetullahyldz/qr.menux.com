// components/ui/popover.tsx
import React from 'react';

interface PopoverProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode; // Popover bileşeni için children
}

const Popover: React.FC<PopoverProps> = ({ open, onOpenChange, children }) => {
  return (
    <div
      className={`popover ${open ? 'open' : 'closed'}`}
      onClick={() => onOpenChange(!open)}
    >
      {children}
    </div>
  );
};

// PopoverContent bileşenine className ve align özelliklerini ekliyoruz
interface PopoverContentProps {
  children: React.ReactNode; // İçerik
  className?: string; // className opsiyonel
  align?: 'start' | 'center' | 'end'; // align özelliği
}

const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  className = '',
  align = 'start', // Varsayılan değer olarak 'start'
}) => {
  return (
    <div
      className={`popover-content ${className} ${align}`}
      style={{ textAlign: align }} // Align'ı kullanarak stil ekliyoruz
    >
      {children}
    </div>
  );
};

const PopoverTrigger: React.FC<PopoverContentProps> = ({ children }) => {
  return <div className="popover-trigger">{children}</div>;
};

export { Popover, PopoverContent, PopoverTrigger };
