# Freshmarketer Copilot for Developers

Freshmarketer Copilot (FM Copilot) is a powerful Visual Studio Code extension designed to assist developers with code generation and Figma to code conversion. It leverages advanced AI capabilities to help you efficiently create code and seamlessly convert Figma designs into code.

## Features

- **Code Generation:** Get AI-powered code suggestions and snippets to speed up your development process.
- **Figma to Code Conversion:** Convert Figma designs to code with ease. The extension can handle various follow-up questions to ensure the conversion is accurate and complete.
- **AI Chat Assistant:** Interact with an AI assistant to get design ideas, coding help, and more. The assistant responds to user inputs based on predefined rules and hidden contexts.

## Installation

1. Download and install Visual Studio Code from [here](https://code.visualstudio.com/).
2. Install the Freshmarketer Copilot extension with VS code.

## Getting Started

To start using FM Copilot:

1. Open the command palette in VS Code (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Search for `Freshmarketer Copilot: Start` and select it.
3. Follow the prompts to authenticate and set up the extension.

## Usage

### Code Generation

Simply start typing your code, and the AI assistant will provide suggestions and snippets to help you complete your tasks faster. The suggestions are context-aware, ensuring relevance to your current coding activity.

### Figma to Code Conversion

1. Provide the URL of your Figma design when prompted.
2. The assistant will guide you through inspecting the Figma design.
3. Provide the Figma node details if not automatically included.
4. The assistant will generate the necessary code based on the provided details.

## Configuration

To configure FM Copilot, open the settings in VS Code and search for `FM Copilot`. You can set the following API keys:

- `fmCopilot.figmaPersonalToken`: Figma Personal Token
- `fmCopilot.geminiApiKey`: Gemini API Key
- `fmCopilot.chatGptApiKey`: ChatGPT API Key
- `fmCopilot.cohereaiApiKey`: CohereAI API Key
- `fmCopilot.deepaiApiKey`: DeepAI API Key

## Development

### Building the Extension

To build the extension, run the following commands:

```bash
npm install
npm run compile
```


### Running the Extension

To run the extension in a development environment:

1. Open this project in VS Code.
2. Press `F5` to open a new VS Code window with the extension loaded.

### Publishing the Extension

To package and publish the extension, use the following command:
```bash
npm run package
```

## Dependencies

- **@google/generative-ai**: AI capabilities for code generation.
- **axios**: HTTP client for making API requests.
- **deepai**: Integration with DeepAI for various AI tasks.
- **tailwindcss**: Utility-first CSS framework for styling.

## Contributing

Contributions are welcome! Please fork this repository and submit pull requests.

## Acknowledgments

Special thanks to the developers and contributors of the libraries and tools used in this project.

## Contact

For support and inquiries, please reach out here (https://github.com/thamotharan-karuppaiah/freshworks-copilot).

---

Freshmarketer Copilot: Your AI-powered assistant for seamless code generation and Figma design conversion.
