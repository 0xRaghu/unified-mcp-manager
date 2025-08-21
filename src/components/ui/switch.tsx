"use client"

import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

function Switch({ checked, onCheckedChange, disabled = false, className }: SwitchProps) {
  return (
    <label className={cn("switch", className)} style={{ display: 'inline-block' }}>
      <input 
        type="checkbox" 
        className="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onCheckedChange(e.target.checked)}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      <div 
        className={cn(
          "slider",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          width: '60px',
          height: '30px',
          backgroundColor: checked ? '#2196F3' : 'lightgray',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          border: '4px solid transparent',
          transition: '.3s',
          boxShadow: '0 0 10px 0 rgb(0, 0, 0, 0.25) inset',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative'
        }}
      >
        <div
          style={{
            content: '',
            display: 'block',
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            transform: checked ? 'translateX(30px)' : 'translateX(-30px)',
            borderRadius: '20px',
            transition: '.3s',
            boxShadow: '0 0 10px 3px rgb(0, 0, 0, 0.25)',
            position: 'absolute'
          }}
        />
      </div>
    </label>
  )
}

export { Switch }