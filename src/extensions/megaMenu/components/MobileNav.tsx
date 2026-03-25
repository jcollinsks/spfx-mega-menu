import * as React from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import styles from './MobileNav.module.scss';
import { IMobileNavProps, IMenuCategory } from '../models';
import { sanitizeNavigationUrl } from '../utils';

export const MobileNav: React.FC<IMobileNavProps> = ({ categories, isOpen, onDismiss }) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  const toggleCategory = React.useCallback((category: string): void => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, category: string): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCategory(category);
      }
    },
    [toggleCategory]
  );

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.smallFixedNear}
      headerText="Navigation"
      isLightDismiss
      closeButtonAriaLabel="Close navigation"
    >
      <div className={styles.mobileNav} role="navigation" aria-label="Mobile navigation">
        {categories.map((category: IMenuCategory) => {
          const isExpanded = expandedCategories.has(category.category);

          return (
            <div key={category.category} className={styles.categorySection}>
              <button
                className={`${styles.categoryHeader} ${isExpanded ? styles.isExpanded : ''}`}
                onClick={(): void => toggleCategory(category.category)}
                onKeyDown={(e): void => handleKeyDown(e, category.category)}
                aria-expanded={isExpanded}
                aria-controls={`mobile-category-${category.category}`}
                type="button"
              >
                {category.category}
                <span className={styles.expandIcon} aria-hidden="true">&#9662;</span>
              </button>

              {isExpanded && (
                <ul
                  className={styles.categoryLinks}
                  id={`mobile-category-${category.category}`}
                  role="list"
                >
                  {category.items.map((item) => (
                    <li key={item.id} className={styles.linkItem}>
                      <a
                        href={sanitizeNavigationUrl(item.navigationUrl)}
                        target={item.openInNewTab ? '_blank' : '_self'}
                        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                        onClick={onDismiss}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};
