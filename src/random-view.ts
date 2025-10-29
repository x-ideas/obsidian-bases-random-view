import {
	BasesView,
	QueryController,
	MarkdownRenderer,
	Component,
	TFile,
} from 'obsidian';

export class RandomView extends BasesView {
	static readonly Type = 'random-view';

	readonly type = RandomView.Type;
	private containerEl: HTMLElement;
	private contentEl: HTMLElement;
	private randomButton: HTMLButtonElement;
	private renderComponent: Component | null = null;

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
		if (!this.validateData()) {
			return;
		}

		const file = this.selectRandomFile();
		if (!file) {
			return;
		}

		try {
			const fileContent = await this.app.vault.read(file);
			const previewSection = this.setupRenderEnvironment();

			const titleDiv = this.renderTitle(previewSection, file);
			this.renderFrontmatter(titleDiv, file);
			await this.renderMarkdownContent(fileContent, file.path, previewSection);
		} catch (error) {
			this.showErrorMessage(file, error);
		}
	}

	/**
	 * Validates if there is data to render
	 * @returns true if data is available, false otherwise
	 */
	private validateData(): boolean {
		const data = this.data.data;
		if (data.length === 0) {
			this.contentEl.empty();
			this.contentEl.createEl('p', {
				text: 'No files to display',
			});
			return false;
		}
		return true;
	}

	/**
	 * Randomly selects a file from the available data
	 * @returns The selected file or null if no data
	 */
	private selectRandomFile(): TFile | null {
		const data = this.data.data;
		if (data.length === 0) {
			return null;
		}

		const randomIndex = Math.floor(Math.random() * data.length);
		const randomEntry = data[randomIndex];
		return randomEntry.file;
	}

	/**
	 * Sets up the render environment by clearing previous content and creating new component
	 * @returns The preview section container element
	 */
	private setupRenderEnvironment(): HTMLElement {
		// Clear content area and unload previous render component
		this.contentEl.empty();
		if (this.renderComponent) {
			this.renderComponent.unload();
			this.removeChild(this.renderComponent);
		}
		this.renderComponent = new Component();
		this.addChild(this.renderComponent);

		// Create markdown preview view container with proper structure
		// This structure matches Obsidian's reading mode
		const markdownPreviewView = this.contentEl.createDiv(
			'markdown-preview-view markdown-rendered node-insert-event is-readable-line-width allow-fold-headings allow-fold-lists show-indentation-guide show-properties',
		);

		// Create preview section container
		return markdownPreviewView.createDiv(
			'markdown-preview-section markdown-preview-sizer',
		);
	}

	/**
	 * Renders the file title with a clickable link
	 * @param previewSection - The preview section container
	 * @param file - The file to render title for
	 * @returns The title div element
	 */
	private renderTitle(previewSection: HTMLElement, file: TFile): HTMLElement {
		const titleDiv = previewSection.createDiv('mod-header mod-ui');
		const titleLink = titleDiv.createEl('a', {
			text: file.basename,
			cls: 'inline-title',
			href: file.path,
		});

		// Register click handler for internal link
		if (this.renderComponent) {
			this.renderComponent.registerDomEvent(titleLink, 'click', (evt) => {
				evt.preventDefault();
				this.app.workspace.openLinkText(file.path, file.path, true);
			});
		}

		return titleDiv;
	}

	/**
	 * Renders the frontmatter metadata if it exists
	 * @param titleDiv - The title div container to append metadata to
	 * @param file - The file to get frontmatter from
	 */
	private renderFrontmatter(titleDiv: HTMLElement, file: TFile): void {
		const fileCache = this.app.metadataCache.getFileCache(file);
		console.log('frontmatter', fileCache?.frontmatter);
		if (!fileCache || !fileCache.frontmatter) {
			return;
		}

		const metadataContainer = titleDiv.createDiv('metadata-container');

		// Add properties heading
		const heading = metadataContainer.createDiv('metadata-properties-heading');
		heading.setText('Properties');

		// Add content
		const content = metadataContainer.createDiv('metadata-content');
		const properties = content.createDiv('metadata-properties');

		Object.entries(fileCache.frontmatter).forEach(([key, value]) => {
			const metadataItem = properties.createDiv('metadata-property');
			metadataItem.createDiv('metadata-property-key').setText(key);
			const valueDiv = metadataItem.createDiv('metadata-property-value');
			this.renderFrontmatterValue(valueDiv, value);
		});
	}

	/**
	 * Renders a single frontmatter value, handling different types and link formats
	 * @param valueDiv - The container div for the value
	 * @param value - The value to render
	 */
	private renderFrontmatterValue(valueDiv: HTMLElement, value: unknown): void {
		if (typeof value === 'string') {
			// Handle internal link format [[link]]
			if (value.startsWith('[[') && value.endsWith(']]')) {
				const link = value.slice(2, -2);
				valueDiv.createEl('a', {
					text: link,
					href: link,
				});
			} else if (value.startsWith('http')) {
				// Handle external link
				valueDiv.createEl('a', {
					text: value,
					href: value,
					cls: 'external-link',
				});
			} else {
				valueDiv.setText(value);
			}
		} else if (Array.isArray(value)) {
			valueDiv.setText(value.join(', '));
		} else {
			valueDiv.setText(String(value));
		}
	}

	/**
	 * Renders the markdown content
	 * @param fileContent - The markdown file content
	 * @param filePath - The path of the file
	 * @param previewSection - The preview section container
	 */
	private async renderMarkdownContent(
		fileContent: string,
		filePath: string,
		previewSection: HTMLElement,
	): Promise<void> {
		if (!this.renderComponent) {
			return;
		}

		await MarkdownRenderer.render(
			this.app,
			fileContent,
			previewSection,
			filePath,
			this.renderComponent,
		);
	}

	/**
	 * Displays an error message when rendering fails
	 * @param file - The file that failed to render
	 * @param error - The error object
	 */
	private showErrorMessage(file: TFile, error: unknown): void {
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
