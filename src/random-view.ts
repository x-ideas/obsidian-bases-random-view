import { BasesView, QueryController, MarkdownRenderer } from 'obsidian';

export class RandomView extends BasesView {
	static readonly Type = 'random-view';

	readonly type = RandomView.Type;
	private containerEl: HTMLElement;
	private contentEl: HTMLElement;
	private randomButton: HTMLButtonElement;

	constructor(controller: QueryController, parentEl: HTMLElement) {
		super(controller);
		this.containerEl = parentEl.createDiv('random-view-container');
	}

	public async onDataUpdated() {
		this.containerEl.empty();

		const data = this.data.data;

		// Create button container
		const buttonContainer = this.containerEl.createDiv(
			'random-button-container',
		);
		this.randomButton = buttonContainer.createEl('button', {
			text: '🎲 Random',
			cls: 'random-button',
		});

		// Create content area
		this.contentEl = this.containerEl.createDiv('random-content');

		// Add click event to random button
		this.randomButton.addEventListener('click', () => {
			this.renderRandomFile();
		});

		// Initial random render
		if (data.length > 0) {
			await this.renderRandomFile();
		} else {
			this.contentEl.createEl('p', {
				text: 'No files to display',
			});
		}
	}

	private async renderRandomFile() {
		const data = this.data.data;

		if (data.length === 0) {
			this.contentEl.empty();
			this.contentEl.createEl('p', {
				text: 'No files to display',
			});
			return;
		}

		// Randomly select one entry
		const randomIndex = Math.floor(Math.random() * data.length);
		const randomEntry = data[randomIndex];
		const file = randomEntry.file;

		// Read file content and render it
		try {
			const fileContent = await this.app.vault.read(file);
			const filePath = file.path;

			// Clear content area
			this.contentEl.empty();

			// Render markdown content in a div
			const contentDiv = this.contentEl.createDiv('file-content');
			await MarkdownRenderer.render(
				this.app,
				fileContent,
				contentDiv,
				filePath,
				this,
			);
		} catch (error) {
			console.error(
				`[RandomView] Failed to render file: ${file.basename}`,
				error,
			);
			this.contentEl.empty();
			this.contentEl.createEl('p', {
				text: `Failed to render file: ${file.basename}`,
			});
		}
	}
}
