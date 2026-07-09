'use client'

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import React, { InputHTMLAttributes, useState } from 'react'
import Input from './Input'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  sizeClass?: string
  fontClass?: string
  rounded?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...args }, ref) => {
    const [terlihat, setTerlihat] = useState(false)

    return (
      <div className={`relative ${className ?? ''}`}>
        <Input ref={ref} type={terlihat ? 'text' : 'password'} className="pr-11" {...args} />
        <button
          type="button"
          onClick={() => setTerlihat((v) => !v)}
          aria-label={terlihat ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          {terlihat ? <EyeSlashIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput
