import React from 'react'
import { Link } from 'wouter'

const Header: React.FC = () => {
  return (
    <nav className='w-full py-[25px] px-[5vw] flex justify-between absolute z-10'>
        <div className=''>
          <img src="/src/assets/logo.webp" alt="" className="h-[50px]" />
        </div>
        <div className="flex gap-[1em] text-[20px]">
            <Link to="/auth" className="px-[1em] py-[0.4em] bg-white text-red-900 font-medium rounded-[10px]">Login</Link>
            <Link to="/auth" className="px-[1em] py-[0.4em] bg-white text-red-900 font-medium rounded-[10px]">Sign Up</Link>
        </div>
    </nav>
  )
}

export default Header