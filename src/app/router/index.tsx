import { createBrowserRouter } from 'react-router';
import { DashboardPage } from 'pages/dashboard';
import { RedirectGeneratorPage } from 'pages/redirect-generator';
import { NotFoundPage } from 'pages/not-found';
import { ErrorBoundaryPage } from 'pages/error-boundary';
import { ROUTES } from 'shared/config';

export const router = createBrowserRouter(
  [
    { path: ROUTES.dashboard, element: <DashboardPage />, errorElement: <ErrorBoundaryPage /> },
    {
      path: ROUTES.redirectGenerator,
      element: <RedirectGeneratorPage />,
      errorElement: <ErrorBoundaryPage />,
    },
    { path: '*', element: <NotFoundPage /> },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
