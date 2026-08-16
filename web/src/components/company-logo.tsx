"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { companyDomain, companyInitials, resolveCompanyIdentity } from "@/lib/company";
import { cn } from "@/lib/cn";

const CONFIG_KEY = "career-one:config";

// A small company mark: the real favicon on a white tile when logos are enabled
// and resolvable, otherwise semantic initials. Unknown identities use one
// neutral entity icon instead of manufacturing a brand treatment. The fallback
// is the always-rendered base layer (SSR-safe + offline floor); the logo fades
// in on top once loaded. See lib/company.ts + /api/logo.
export function CompanyLogo({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const [enabled, setEnabled] = useState(false); // monogram-only until config known
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const v = raw ? JSON.parse(raw) : null;
      setEnabled(v?.logos !== false); // default ON unless explicitly disabled
    } catch {
      setEnabled(true);
    }
  }, []);

  const identity = resolveCompanyIdentity(name);
  const domain = companyDomain(name);
  const radius = Math.max(4, Math.round(size * 0.28));
  const showImg = identity.kind === "known" && enabled && !!domain && !failed;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-border", className)}
      style={{ width: size, height: size, borderRadius: radius }}
      aria-hidden="true"
    >
      {identity.kind !== "known" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-outline-bg text-icon-muted">
          <Building2
            aria-hidden="true"
            style={{ width: Math.round(size * 0.48), height: Math.round(size * 0.48) }}
          />
        </span>
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center bg-action-secondary font-semibold leading-none text-action-secondary-foreground"
          style={{
            fontSize: Math.round(size * 0.4),
            letterSpacing: "-0.02em",
          }}
        >
          {companyInitials(name)}
        </span>
      )}
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/logo?domain=${encodeURIComponent(domain!)}`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full bg-white object-contain transition-opacity duration-200"
          style={{ opacity: loaded ? 1 : 0, padding: Math.max(1, Math.round(size * 0.1)) }}
        />
      )}
    </span>
  );
}
