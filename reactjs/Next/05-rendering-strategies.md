# Rendering Strategies en Next.js

Next.js permite elegir entre SSR, SSG, ISR, Streaming y Partial Rendering.

**Ejemplo SSR:**
```tsx
export async function getServerSideProps() {
  return { props: { data: await fetchData() } };
}
```

**Ejemplo SSG:**
```tsx
export async function getStaticProps() {
  return { props: { data: await fetchData() } };
}
```

**Ejemplo ISR:**
```tsx
export async function getStaticProps() {
  return { props: { data: await fetchData() }, revalidate: 60 };
}
```
