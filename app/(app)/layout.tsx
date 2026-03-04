import { GlobalNav } from "@/app/components/GlobalNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-[70px] sm:pb-0 sm:pt-[48px]">{children}</div>
      <GlobalNav />
    </>
  );
}
