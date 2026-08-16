import { PressTypographyScale } from "@/components/press/PressTypographyScale";

export default function PressLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PressTypographyScale />
      {children}
    </>
  );
}
