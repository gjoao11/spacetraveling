import { useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';
import { Footer } from '../../components/Footer';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  prevPost: Post | null;
  nextPost: Post | null;
}

export default function Post({
  post,
  preview,
  prevPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  const [readingTime] = useState(() => {
    const numberOfWords = post?.data.content.reduce((prevVal, currVal) => {
      return (
        prevVal +
        currVal.body.reduce((bodyPrevVal, bodyCurrVal) => {
          return bodyPrevVal + String(bodyCurrVal.text).match(/(\w+)/g).length;
        }, 0)
      );
    }, 0);

    const wordsPerMinute = 200;

    return Math.ceil(numberOfWords / wordsPerMinute);
  });

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      <Header />

      <div className={styles.bannerContainer}>
        <img src={post.data.banner.url} alt="banner" />
      </div>

      <main className={` ${styles.container} ${commonStyles.container}`}>
        <h1>{post.data.title}</h1>
        <div className={styles.info}>
          <div>
            <time>
              <FiCalendar size={20} color="#BBBBBB" />
              {format(new Date(post.first_publication_date), 'd MMM y', {
                locale: ptBR,
              })}
            </time>

            <span>
              <FiUser size={20} color="#BBBBBB" />
              {post.data.author}
            </span>

            <span>
              <FiClock size={20} color="#BBBBBB" />
              {readingTime} min
            </span>
          </div>

          <div>
            <time>
              <span>
                * editado em &nbsp;
                {format(new Date(post.first_publication_date), 'd MMM y', {
                  locale: ptBR,
                })}
                , às &nbsp;
                {format(new Date(post.last_publication_date), 'HH:mm', {
                  locale: ptBR,
                })}
              </span>
            </time>
          </div>
        </div>

        <article>
          {post.data.content.map(content => (
            <div key={content.heading} className={styles.postContent}>
              <h2>{content.heading}</h2>
              <div
                className={styles.content}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </div>
          ))}
        </article>
      </main>

      <Footer>
        <div className={styles.postNavigation}>
          {prevPost && (
            <div className={styles.prevPost}>
              <Link href={`/post/${prevPost.uid}`}>
                <a>
                  {prevPost.data.title}
                  <span>Post anterior</span>
                </a>
              </Link>
            </div>
          )}

          {nextPost && (
            <div className={styles.nextPost}>
              <Link href={`/post/${nextPost.uid}`}>
                <a>
                  {nextPost.data.title}
                  <span>Próximo post</span>
                </a>
              </Link>
            </div>
          )}
        </div>

        <Comments />
      </Footer>

      {preview && (
        <aside className={commonStyles.exitPreview}>
          <Link href="/api/exit-preview">
            <a>Sair do modo Preview</a>
          </Link>
        </aside>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.predicates.at('document.type', 'post'),
    { pageSize: 1, page: 1 }
  );

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response) {
    return {
      notFound: true,
    };
  }

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content.heading,
        body: content.body,
      })),
    },
  };

  const prevPost = (
    await prismic.query(Prismic.Predicates.at('document.type', 'post'), {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    })
  ).results[0];

  const nextPost = (
    await prismic.query(Prismic.Predicates.at('document.type', 'post'), {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    })
  ).results[0];

  return {
    props: {
      post,
      preview,
      prevPost: prevPost ?? null,
      nextPost: nextPost ?? null,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
