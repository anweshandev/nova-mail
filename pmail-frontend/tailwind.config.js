export default {
	darkMode: 'class',
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
		"./public/404.html",
		"./build/index.html",
	],
	theme: { },
	plugins: [
		require('@tailwindcss/typography'),
	],
};
