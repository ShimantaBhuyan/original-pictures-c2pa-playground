import Link from 'next/link';

interface BaseProps {
  variant?: 'primary' | 'ghost';
  className?: string;
}

interface ButtonAsButton extends BaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  as?: 'button';
  href?: undefined;
}

interface ButtonAsLink extends BaseProps, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  as: 'a';
  href: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({ variant = 'primary', className = '', children, as, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center text-sm font-semibold uppercase tracking-[0.05em] px-7 py-3 rounded-md transition-colors duration-[var(--duration-default)] cursor-pointer font-[family-name:var(--font-sans)]';
  const variants = {
    primary: 'bg-notary text-white hover:bg-marine',
    ghost: 'bg-transparent text-notary border border-slate-200 hover:bg-cream',
  };
  const classes = `${base} ${variants[variant]} ${className}`;

  if (as === 'a') {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props as React.ButtonHTMLAttributes<HTMLButtonElement>}>
      {children}
    </button>
  );
}
