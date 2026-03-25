import * as React from 'react';
import styles from './MegaMenuContainer.module.scss';
import { IMegaMenuContainerProps } from '../models';
import { MegaMenuNav } from './MegaMenuNav';
import { MobileNav } from './MobileNav';
import { NotificationBar } from './NotificationBar';
import { isValidNavigationUrl } from '../utils';

export const MegaMenuContainer: React.FC<IMegaMenuContainerProps> = (props) => {
  const { categories, notifications, logoUrl } = props;
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList): void => {
      setIsMobile(e.matches);
      if (!e.matches) {
        setIsMobileOpen(false);
      }
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange as (e: MediaQueryListEvent) => void);

    return (): void => {
      mediaQuery.removeEventListener('change', handleChange as (e: MediaQueryListEvent) => void);
    };
  }, []);

  const handleOpenMobile = React.useCallback((): void => {
    setIsMobileOpen(true);
  }, []);

  const handleCloseMobile = React.useCallback((): void => {
    setIsMobileOpen(false);
  }, []);

  return (
    <div className={styles.megaMenuContainer}>
      <div className={styles.navBar}>
        {logoUrl && isValidNavigationUrl(logoUrl) && (
          <div className={styles.logo}>
            <a href="/" aria-label="Home">
              <img src={logoUrl} alt="Site logo" />
            </a>
          </div>
        )}

        <div className={styles.navWrapper}>
          <MegaMenuNav categories={categories} />
        </div>

        <button
          className={styles.hamburgerButton}
          onClick={handleOpenMobile}
          aria-label="Open navigation menu"
          aria-expanded={isMobileOpen}
          type="button"
        >
          &#9776;
        </button>
      </div>

      {notifications.length > 0 && (
        <NotificationBar notifications={notifications} />
      )}

      {isMobile && (
        <MobileNav
          categories={categories}
          isOpen={isMobileOpen}
          onDismiss={handleCloseMobile}
        />
      )}
    </div>
  );
};
