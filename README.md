# Milo - AI Text Transformation Tool

<div align="center">
  <img src="public/icon.png" alt="Milo Logo" width="128" height="128">
</div>

Milo is a lightweight desktop application that helps you transform text using AI. It lives in your system tray and provides quick access to text transformation with customizable tones.

## Features

- 🎯 Transform clipboard text with one click
- 🎨 Customize transformation tones
- 🔄 Quick access from system tray
- ⚡ Fast and lightweight

## Installation

### Prerequisites

- Node.js (v16 or later)
- pnpm (latest version)
- Rust (latest stable)
- OpenAI API key

### Build from Source

1. Clone the repository:
```bash
git clone https://github.com/yourusername/milo.git
cd milo
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the application:
```bash
pnpm run tauri build
```

The built application will be available in `src-tauri/target/release`.

## Usage

1. Launch Milo - it will appear in your system tray
2. Click the tray icon and select "Settings"
3. Enter your OpenAI API key
4. Copy any text you want to transform
5. Click "Transform" from the tray menu
6. The transformed text will be copied to your clipboard

### Customizing Tones

1. Open Settings from the tray menu
2. Click "Add New Tone"
3. Enter a name and prompt for your custom tone
4. Select your tone before transforming text

## Development

### Tech Stack

- Frontend: React + Vite
- Backend: Rust + Tauri
- AI: OpenAI API

### Development Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start development server:
```bash
pnpm run tauri dev
```

### Building for Production

```bash
pnpm run tauri build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app)
- AI powered by [OpenAI](https://openai.com)
- Icons by [Heroicons](https://heroicons.com)
