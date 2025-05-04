import './index.css'

import React from 'react'

interface NumInputProps {
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  value: number;
  name?: string;
}

export default function NumInput({onChange, value, name}: NumInputProps) {
    return (
        <input type="number" onChange={onChange} value={value} name={name} className="accent-red-400 focus:border-0 ring-1 ring-gray-200 px-2 py-0.5 rounded-full focus:ring-red-500"></input>
    )
}

