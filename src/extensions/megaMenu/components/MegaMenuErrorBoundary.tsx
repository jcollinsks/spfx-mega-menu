import * as React from 'react';
import { Log } from '@microsoft/sp-core-library';

const LOG_SOURCE = 'MegaMenuErrorBoundary';

interface IMegaMenuErrorBoundaryProps {
  children: React.ReactNode;
}

interface IMegaMenuErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error Boundary for the Mega Menu component tree.
 * Catches unhandled render errors and displays a minimal fallback navigation
 * instead of leaving users with no navigation at all.
 *
 * Code quality finding: CQ-06
 */
export class MegaMenuErrorBoundary extends React.Component<
  IMegaMenuErrorBoundaryProps,
  IMegaMenuErrorBoundaryState
> {
  public state: IMegaMenuErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): IMegaMenuErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Log.error(LOG_SOURCE, new Error(`MegaMenu render failure: ${error.message}`));
    Log.error(LOG_SOURCE, new Error(`Component stack: ${errorInfo.componentStack}`));
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <nav
          aria-label="Main navigation (fallback)"
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#0078d4',
            height: '50px',
            padding: '0 20px',
          }}
        >
          <a
            href="/"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Home
          </a>
        </nav>
      );
    }

    return this.props.children;
  }
}
