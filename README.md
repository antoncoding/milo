# Milo - AI Text Transformation Tool

<div align="center">
  <img src="public/icon.png" alt="Milo Logo" width="128" height="128">
</div>

Milo is a lightweight desktop application that helps you transform text using AI. Copy any text, hit a keyboard shortcut, and get instant AI transformations with customizable tones.

## ✨ Features

- 🎯 **Instant transformations** - Transform clipboard text with global shortcuts
- 🎨 **Custom tones** - Create personalized transformation prompts
- 📊 **Usage tracking** - Monitor your transformations and word counts
- 🔄 **Auto-updates** - Seamless updates with built-in update system
- 🌙 **Dark mode** - Beautiful light and dark themes
- ⚡ **Lightweight** - Fast, native desktop app built with Tauri

## 🚀 Quick Start

### Download

1. Visit the [Releases page](https://github.com/antoncoding/milo/releases)
2. Download the latest version for your platform
3. Install and launch Milo

### Setup

1. **Get a usage key** from the [official Milo website](https://milo-ai.com)
2. **Open Milo settings** from the system tray
3. **Enter your usage key** in the settings
4. **Start transforming!** Copy text and use the shortcut (default: `Cmd+M`)

## 🎯 How to Use

1. **Copy any text** you want to transform
2. **Press your shortcut** (default: `Cmd+M`)
3. **Your transformed text** replaces the clipboard content
4. **Paste anywhere** - the improved text is ready to use!

## ⚙️ Configuration

- **Custom shortcuts** - Set your preferred key combination
- **Transform tones** - Create custom prompts for different writing styles
- **Usage tracking** - View your transformation history and statistics
- **Auto-updates** - Enable automatic app updates

# Releasing

## 🔐 Important: Back Up Your Signing Key

**For developers building from source:**

Your Tauri signing key is located at `~/.tauri/milo.key`. **CRITICAL:** Back this up securely!

---

## 🛠️ Development

### Prerequisites

- Node.js (v16 or later)
- pnpm (latest version)
- Rust (latest stable)
- Milo usage key (for testing)

### Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Rust + Tauri v2
- **AI Integration**: LiteLLM proxy server
- **Auto-updates**: Built-in Tauri updater with cryptographic signatures

### Build from Source

1. **Clone and install**:
   ```bash
   git clone https://github.com/antoncoding/milo.git
   cd milo
   pnpm install
   ```

2. **Development server**:
   ```bash
   pnpm run tauri dev
   ```

3. **Production build**:
   ```bash
   pnpm run tauri build
   ```

### 🚀 Release Process

See [`RELEASE.md`](RELEASE.md) for complete release instructions.

### 📁 Project Structure

```
milo/
├── src/                    # React frontend
├── src-tauri/             # Rust backend
├── scripts/               # Release automation
├── public/                # Static assets
└── dist/                  # Built frontend
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
