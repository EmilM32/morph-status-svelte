import type { StatusColors } from '#lib';

export const colorPresets: { id: string; label: string; colors: StatusColors }[] = [
	{
		id: 'system',
		label: 'System',
		colors: {
			idle: '#8E8E93',
			loading: '#0A84FF',
			success: '#30D158',
			error: '#FF453A',
			warning: '#FFD60A'
		}
	},
	{
		id: 'ink',
		label: 'Ink',
		colors: {
			idle: '#636366',
			loading: '#F5F5F7',
			success: '#F5F5F7',
			error: '#F5F5F7',
			warning: '#F5F5F7'
		}
	},
	{
		id: 'signal',
		label: 'Signal',
		colors: {
			idle: '#64D2FF',
			loading: '#BF5AF2',
			success: '#63E6BE',
			error: '#FF375F',
			warning: '#FF9F0A'
		}
	}
];

export const sizePresets = [
	{ id: 's', label: 'S', size: 32, stroke: 12 },
	{ id: 'm', label: 'M', size: 84, stroke: 10 },
	{ id: 'l', label: 'L', size: 168, stroke: 10 }
] as const;
