# MoE Transformer Calculator

A web application for calculating parameters in Mixture of Experts (MoE) transformer models. This tool helps machine learning engineers and researchers estimate the number of parameters in different components of transformer architectures using MoE.

## Features

- Calculate total parameters for MoE transformer models
- Visualize parameter distribution across model components
- Estimate inference parameters (with selected experts)
- Interactive UI for real-time parameter updates
- Calculate key-query space dimensions

## Technology Stack

### Frontend
- React 
- TypeScript
- Vite (for fast development and bundling)
- TailwindCSS for styling

### Backend
- FastAPI (Python)
- Pydantic for data validation
- Uvicorn ASGI server

## Getting Started

### Prerequisites
- Node.js (v16+)
- Python 3.8+

### Quick Start
The easiest way to start the application is to use the provided startup scripts:

#### Windows
Simply run the `start_app.bat` file:
```
start_app.bat
```

#### Linux/Mac
Run the shell script:
```
chmod +x start_app.sh  # Make it executable (first time only)
./start_app.sh
```

These scripts will:
1. Check for required dependencies
2. Install necessary packages
3. Start both frontend and backend servers
4. Open the application in your browser

### Manual Setup

#### Frontend Setup
1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

#### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Start the server:
   ```
   python backend.py
   ```

## Usage

1. Open the application in your browser (typically at http://localhost:5173)
2. Adjust the model parameters using the input fields:
   - Vocab Size
   - Embedding Dimension
   - Attention Heads
   - Neurons
   - Experts
   - Layers
3. View the calculated results in real-time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
