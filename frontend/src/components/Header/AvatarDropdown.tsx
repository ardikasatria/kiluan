'use client'

import Avatar from '@/shared/Avatar'
import ButtonCircle from '@/shared/ButtonCircle'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import { useAuth } from '@/contexts/AuthProvider'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import {
  Logout01Icon,
  PassportIcon,
  Task01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface Props {
  className?: string
}

export default function AvatarDropdown({ className }: Props) {
  const { user, logout, isLoggedIn } = useAuth()

  if (!isLoggedIn || !user) return null

  return (
    <div className={className}>
      <Popover>
        <PopoverButton as={ButtonCircle} className="relative" plain>
          <Avatar alt="avatar" src={user.avatar} width={32} height={32} className="size-8 rounded-full object-cover" />
        </PopoverButton>

        <PopoverPanel
          transition
          anchor={{
            to: 'bottom end',
            gap: 16,
          }}
          className="z-40 w-80 rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0"
        >
          <div className="relative flex flex-col gap-y-4 bg-white px-6 py-7 dark:bg-neutral-800">
            <div className="relative flex items-center gap-x-3">
              <Avatar
                alt="avatar"
                src={user.avatar}
                width={48}
                height={48}
                className="size-12 rounded-full object-cover"
              />
              <div className="grow">
                <h4 className="font-semibold">{user.name}</h4>
                <p className="text-xs/6 text-neutral-500">{user.role}</p>
              </div>
            </div>

            <Divider />

            <Link
              href="/dashboard"
              className="-m-3 flex items-center gap-x-4 rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <HugeiconsIcon icon={UserIcon} size={24} strokeWidth={1.5} />
              <p className="text-sm font-medium">Profil Saya</p>
            </Link>

            <Link
              href="/paspor"
              className="-m-3 flex items-center gap-x-4 rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <HugeiconsIcon icon={PassportIcon} size={24} strokeWidth={1.5} />
              <p className="text-sm font-medium">Paspor Lestari</p>
            </Link>

            <Link
              href="/dashboard/posts"
              className="-m-3 flex items-center gap-x-4 rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <HugeiconsIcon icon={Task01Icon} size={24} strokeWidth={1.5} />
              <p className="text-sm font-medium">Aktivitas Saya</p>
            </Link>

            <Divider />

            <button
              type="button"
              onClick={() => logout()}
              className="-m-3 flex w-full items-center rounded-lg p-2 text-start transition duration-150 ease-in-out hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <HugeiconsIcon icon={Logout01Icon} size={24} strokeWidth={1.5} />
              <p className="ms-4 text-sm font-medium">Keluar</p>
            </button>
          </div>
        </PopoverPanel>
      </Popover>
    </div>
  )
}
