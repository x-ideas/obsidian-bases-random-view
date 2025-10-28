import { Plugin, QueryController } from 'obsidian';
import { RandomView } from './random-view';
import './styles.css';

export default class RandomPlugin extends Plugin {
	async onload() {
		this.registerBasesView(RandomView.Type, {
			name: 'Random',
			icon: 'lucide-dices',
			factory: (controller: QueryController, parentEl: HTMLElement) => {
				return new RandomView(controller, parentEl);
			},
		});
	}

	onunload() {}

	api = {
		// define your API methods here
	};
}
