import { PriceUpdaterPage } from './components/price-updater/PriceUpdaterPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
    const { route } = useHashRoute();

    if (route === '/settings') {
        return <SettingsPage />;
    }

    return <PriceUpdaterPage />;
}