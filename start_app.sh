#!/bin/bash

# Define ANSI color codes
GREEN="\033[92m"
CYAN="\033[96m"
RED="\033[91m"
RESET="\033[0m"

# Function to print colored messages
print_error() {
    echo -e "${RED}Error: $1${RESET}"
}

print_success() {
    echo -e "${GREEN}$1${RESET}"
}

print_info() {
    echo -e "${CYAN}$1${RESET}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in the PATH."
    exit 1
fi

# Check if port 4173 is in use
if lsof -Pi :4173 -sTCP:LISTEN -t &> /dev/null; then
    print_error "Port 4173 is already in use."
    exit 1
fi

# Check if port 8000 is in use
if lsof -Pi :8000 -sTCP:LISTEN -t &> /dev/null; then
    print_error "Port 8000 is already in use."
    exit 1
fi

# All checks passed, now install and run the application
echo "Installing frontend dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install npm dependencies."
    exit 1
fi

# Start frontend in a new terminal
echo "Starting frontend..."
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "npm run start; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "npm run start; bash" &
elif command -v konsole &> /dev/null; then
    konsole --new-tab -e "npm run start; bash" &
else
    # Fallback to background process if no terminal emulator is found
    npm run start &
    frontend_pid=$!
    echo "Frontend running in background (PID: $frontend_pid)"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    print_error "Failed to install Python dependencies."
    exit 1
fi

# Start backend in a new terminal
echo "Starting backend..."
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "python backend.py; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "python backend.py; bash" &
elif command -v konsole &> /dev/null; then
    konsole --new-tab -e "python backend.py; bash" &
else
    # Fallback to background process if no terminal emulator is found
    python backend.py &
    backend_pid=$!
    echo "Backend running in background (PID: $backend_pid)"
fi

# Change back to the original directory
cd ..

# Display success message
print_success "Transformer tools website running."
echo
print_info "Access the frontend at: http://localhost:4173"
print_info "Backend API available at: http://localhost:8000"

echo
echo "Press Enter to close this window..."
read 