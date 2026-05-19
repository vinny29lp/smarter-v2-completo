import { Suspense } from "react";
import { LeadCapturaForm } from "./LeadCapturaForm";

export default function LeadPublicPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center">
        <p className="text-white text-sm">Carregando...</p>
      </div>
    }>
      <LeadCapturaForm />
    </Suspense>
  );
}
