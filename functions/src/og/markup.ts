import { VNode } from '../types'

function createMarkup(data: {
  avatar: string
  username: string
  cards: string
  rank: string
  backgroundImage: string
}): VNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1200px',
        height: '630px',
        backgroundImage: data.backgroundImage
          ? `url(${data.backgroundImage})`
          : '#1a202c',
        backgroundSize: '100%',
        backgroundPosition: 'center'
      },
      children: [
        {
          type: 'img',
          props: {
            src: data.avatar,
            width: '133',
            height: '133',
            style: {
              borderRadius: '50%',
              position: 'absolute',
              transform: 'translate(-155px, 46px)'
            }
          }
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              transform: 'translate(0px, 20px)'
            },
            children: [
              {
                type: 'h1',
                props: {
                  style: {
                    fontSize: '45px',
                    color: 'white',
                    position: 'absolute',
                    transform: 'translate(-50px, -25px) rotate(6deg)'
                  },
                  children: data.username
                }
              },
              {
                type: 'p',
                props: {
                  style: {
                    fontSize: '38px',
                    color: 'white',
                    position: 'absolute',
                    transform: 'translate(-55px, 32px) rotate(6deg)'
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: 'white' },
                        children: 'Rank '
                      }
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          color: '#fa86ce',
                          transform: 'translate(10px)'
                        },
                        children: data.rank
                      }
                    }
                  ]
                }
              },
              {
                type: 'p',
                props: {
                  style: {
                    color: '#2e58ff',
                    fontSize: '38px',
                    position: 'absolute',
                    transform: 'translate(50px, 38px) rotate(6deg)'
                  },
                  children: '|'
                }
              },
              {
                type: 'p',
                props: {
                  style: {
                    fontSize: '38px',
                    color: 'white',
                    position: 'absolute',
                    transform: 'translate(80px, 48px) rotate(6deg)'
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#fa86ce' },
                        children: data.cards
                      }
                    },
                    {
                      type: 'span',
                      props: {
                        style: { transform: 'translate(10px)' },
                        children: 'Cartas'
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  }
}

export default createMarkup
