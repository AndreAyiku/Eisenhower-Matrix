interface Props {
  title: string;
}

export default function ComingSoon({ title }: Props) {
  return (
    <div className="coming-soon">
      <h1 className="title">{title}</h1>
      <p className="subtitle">This screen is coming soon.</p>
    </div>
  );
}