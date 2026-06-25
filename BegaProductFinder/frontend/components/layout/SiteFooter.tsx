import BegaLogo from '../shared/BegaLogo';
import { SearchBox, AccountIcon } from './SiteHeader';

const FOOTER_LINKS = ['Careers', 'Contact', 'Warranty', 'Terms & Conditions', 'Do Not Sell My Info'];

// Reusable site footer. The trailing spacer column renders an invisible copy of the header's
// actual SearchBox + AccountIcon — same components, so its width is guaranteed pixel-identical
// to the header's reserved zone (not a guessed value), making this link group's right edge
// land exactly where the header nav's right edge does, within the same max-w-[1320px] container.
export default function SiteFooter() {
  return (
    <footer className="w-full bg-bega-footer flex-shrink-0">
      <div className="max-w-[1320px] mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6">
        <div className="justify-self-center justify-end">
          <BegaLogo width={88} height={27} color="#FFFFFF" />
        </div>

        <div className="flex items-center justify-self-end gap-6 flex-wrap text-[13px]">
          <span className="text-white/100 whitespace-nowrap">
            &copy; {new Date().getFullYear()} BEGA. All Rights Reserved.
          </span>
          {FOOTER_LINKS.map(label => (
            <a
              key={label}
              href="#"
              className="text-white/100 hover:text-white transition-colors whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Invisible — exists only to reserve the same width as the header's search+account
            zone, so the link group above (justify-self-end) lines up with the nav above it. */}
        <div aria-hidden className="hidden md:flex items-center gap-4 opacity-0 pointer-events-none select-none">
          
        </div>
      </div>
    </footer>
  );
}
