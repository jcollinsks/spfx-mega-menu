import * as React from 'react';
import styles from './MegaMenuNav.module.scss';
import { IMegaMenuNavProps, IMenuCategory } from '../models';

const HOVER_CLOSE_DELAY_MS = 300;

export const MegaMenuNav: React.FC<IMegaMenuNavProps> = ({ categories }) => {
  const [openCategory, setOpenCategory] = React.useState<string | null>(null);
  const closeTimerRef = React.useRef<number | undefined>(undefined);
  const navRef = React.useRef<HTMLUListElement>(null);

  const clearCloseTimer = React.useCallback((): void => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const startCloseTimer = React.useCallback((): void => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenCategory(null);
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const handleCategoryEnter = React.useCallback((category: string): void => {
    clearCloseTimer();
    setOpenCategory(category);
  }, [clearCloseTimer]);

  const handleCategoryLeave = React.useCallback((): void => {
    startCloseTimer();
  }, [startCloseTimer]);

  const handleDropdownEnter = React.useCallback((): void => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  const handleDropdownLeave = React.useCallback((): void => {
    startCloseTimer();
  }, [startCloseTimer]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent, category: string): void => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setOpenCategory((prev) => (prev === category ? null : category));
        break;
      case 'Escape':
        e.preventDefault();
        setOpenCategory(null);
        (e.target as HTMLElement).focus();
        break;
      default:
        break;
    }
  }, []);

  const handleLinkKeyDown = React.useCallback((e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpenCategory(null);
      const categoryButton = navRef.current?.querySelector(
        `[data-category="${openCategory}"]`
      ) as HTMLElement | null;
      categoryButton?.focus();
    }
  }, [openCategory]);

  React.useEffect(() => {
    return (): void => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Main navigation">
      <ul className={styles.megaMenuNav} ref={navRef} role="menubar">
        {categories.map((category: IMenuCategory) => {
          const isOpen = openCategory === category.category;

          return (
            <li
              key={category.category}
              role="none"
              onMouseEnter={(): void => handleCategoryEnter(category.category)}
              onMouseLeave={handleCategoryLeave}
              style={{ position: 'relative' }}
            >
              <button
                className={`${styles.categoryButton} ${isOpen ? styles.isOpen : ''}`}
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={isOpen}
                data-category={category.category}
                onKeyDown={(e): void => handleKeyDown(e, category.category)}
                tabIndex={0}
                type="button"
              >
                {category.category}
                <span className={styles.chevron} aria-hidden="true">&#9662;</span>
              </button>

              {isOpen && (
                <div
                  className={styles.dropdownPanel}
                  role="menu"
                  aria-label={`${category.category} submenu`}
                  onMouseEnter={handleDropdownEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className={styles.categoryColumn}>
                    <h3 className={styles.categoryHeader}>{category.category}</h3>
                    <ul className={styles.linkList} role="none">
                      {category.items.map((item) => (
                        <li key={item.id} className={styles.linkItem} role="none">
                          <a
                            href={item.navigationUrl}
                            role="menuitem"
                            target={item.openInNewTab ? '_blank' : '_self'}
                            rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                            onKeyDown={handleLinkKeyDown}
                            tabIndex={0}
                          >
                            {item.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
