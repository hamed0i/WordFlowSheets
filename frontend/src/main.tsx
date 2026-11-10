import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';

const rootElement = document.getElementById('sheets-excel-updater-app');

if (!rootElement) {
    throw new Error('Sheets Excel Updater root element was not found.');
}

class AppErrorBoundary extends Component<{children: ReactNode}, {error: string | null}> {
    state = {error: null as string | null};
    static getDerivedStateFromError(error: unknown) {
        return {error: error instanceof Error ? error.message : 'خطای ناشناخته'};
    }
    render() {
        if (this.state.error) return <div dir="rtl" role="alert" style={{padding: 24, background: '#fff', color: '#b91c1c'}}>
            <p>بارگذاری افزونه با خطا مواجه شد. متن زیر را برای پشتیبانی ارسال کنید:</p>
            <pre dir="ltr" style={{whiteSpace: 'pre-wrap'}}>{this.state.error}</pre>
            <button type="button" onClick={() => window.location.reload()}>بازخوانی صفحه</button>
        </div>;
        return this.props.children;
    }
}
createRoot(rootElement).render(
    <StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>,
);