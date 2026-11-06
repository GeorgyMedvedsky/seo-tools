import { RouterProvider } from 'react-router';
import { I18nextProvider } from 'react-i18next';
import { i18next } from 'shared/config';
import { router } from './router';

function App() {
  return (
    <I18nextProvider i18n={i18next}>
      <RouterProvider router={router} />
    </I18nextProvider>
  );
}

export default App;
