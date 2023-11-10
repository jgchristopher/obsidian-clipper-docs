import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import styles from "./index.module.css";

import ReactPlayer from "react-player";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/">
            Obsidian Clipper Docs
          </Link>
        </div>
        <div class={styles.videoRow}>
          <div className={styles.video}>
            <h2>Getting Started</h2>
            <ReactPlayer false controls url="https://youtu.be/kINRwNG2LCQ" />
          </div>
          <div className={styles.video}>
            <h2>Installing Chrome Extension </h2>
            <ReactPlayer false controls url="https://youtu.be/cLYLs2NTZ-k" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <main></main>
    </Layout>
  );
}
