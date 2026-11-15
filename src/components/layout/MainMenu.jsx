import { Icon } from '../ui/Icon.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { MAIN_MENU } from '../../config/menu.js';

function SubLink({ children, onClick, className = '' }) {
  return (
    <a href="#" onClick={onClick} className={className}>
      {children}
    </a>
  );
}

function TopItem({ item, inert }) {
  const hasSub = Boolean(item.mega || item.items);
  return (
    <li className={`group ${item.mega ? '' : 'relative'}`}>
      <a
        href="#"
        onClick={inert}
        className="relative inline-block whitespace-nowrap py-0 pl-5 pr-[28px] text-[16px] leading-[60px] text-menu transition-colors duration-300 group-hover:bg-vt group-hover:text-white group-focus-within:bg-vt group-focus-within:text-white max-xl:pl-3 max-xl:pr-6 max-xl:text-[15px]"
      >
        {item.label}
        {hasSub && <Icon name="chevron" className="absolute right-2 top-[24px] h-3 w-3" strokeWidth={2.5} />}
      </a>

      {hasSub && !item.mega && (
        <ul className="invisible absolute left-0 top-full z-[205] w-[280px] origin-top scale-y-90 rounded-b-[5px] bg-white opacity-0 shadow-[0_8px_16px_rgba(0,0,0,.14)] transition duration-300 group-hover:visible group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:scale-y-100 group-focus-within:opacity-100">
          {item.items.map((t) => (
            <li key={t}>
              <SubLink onClick={inert} className="mx-5 block border-b border-[#e3e3e3] text-[16px] leading-[56px] text-menu hover:text-[#d83d33] [li:last-child>&]:border-b-0">
                {t}
              </SubLink>
            </li>
          ))}
        </ul>
      )}

      {item.mega && (
        <div className="invisible absolute left-0 top-full z-[205] flex w-full origin-top scale-y-90 rounded-b-[5px] bg-white opacity-0 shadow-[0_8px_16px_rgba(0,0,0,.14)] transition duration-300 group-hover:visible group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:scale-y-100 group-focus-within:opacity-100">
          {item.columns.map((col) => (
            <div key={col.title} className="w-[240px] shrink px-5 pb-5 pt-[29px]">
              <SubLink onClick={inert} className="block text-[15px] font-semibold leading-[35px] text-black hover:text-[#d83d33]">
                {col.title}
              </SubLink>
              <ul>
                {col.items.map((t) => (
                  <li key={t}>
                    <SubLink onClick={inert} className="block text-[14px] leading-[35px] text-menu hover:text-[#d83d33]">
                      {t}
                    </SubLink>
                  </li>
                ))}
                {col.more && (
                  <li>
                    <SubLink onClick={inert} className="block text-[14px] leading-[35px] text-vt hover:underline">
                      Xem thêm
                    </SubLink>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

export function MainMenu() {
  const { inert } = useToast();
  return (
    <>
      {/* Desktop: thanh menu dính + dropdown / mega menu */}
      <nav
        aria-label="Menu chính"
        className="sticky top-[var(--notice-h,36px)] z-[900] hidden bg-white shadow-[0_1px_0_#ececec] lg:block"
      >
        <div className="relative mx-auto w-[90%] max-w-[1400px]">
          <ul className="flex flex-nowrap">
            {MAIN_MENU.map((item) => (
              <TopItem key={item.label} item={item} inert={inert} />
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile: dải menu cuộn ngang (chỉ giữ hình thức) */}
      <nav aria-label="Menu chính" className="border-b border-gray-200 bg-white lg:hidden">
        <ul className="flex overflow-x-auto whitespace-nowrap px-2 py-1 text-[14px] text-menu [scrollbar-width:none]">
          {MAIN_MENU.map((item) => (
            <li key={item.label}>
              <a href="#" onClick={inert} className="block px-3 py-2 font-semibold hover:text-vt">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
