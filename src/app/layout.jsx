import './globals.css';
import PersistentWorkspace from '@/components/PersistentWorkspace';

export const metadata = { title: 'NasirDB', description: 'Company Manager' };

export default function RootLayout({ children }) {
	return (
		<html lang='fa-AF' dir='rtl'>
			<body><PersistentWorkspace>{children}</PersistentWorkspace></body>
		</html>
	);
}