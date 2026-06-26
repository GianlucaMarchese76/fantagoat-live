type Props = {
  codice: string;
  size?: number;
};

export default function Bandiera({
  codice,
  size = 20,
}: Props) {
  return (
    <img
      src={`/bandiere/${codice}.svg`}
      alt={codice}
      width={size}
      height={size}
      className="inline-block rounded-sm object-cover"
    />
  );
}