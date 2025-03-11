import React, { useRef, useEffect, useState, useCallback } from "react";
import { 
  PdfLoader, 
  PdfHighlighter,
  Popup,
  Highlight,
  Tip,
  AreaHighlight
} from "react-pdf-highlighter";
import type { IHighlight, NewHighlight, ScaledPosition, Content } from "react-pdf-highlighter";
import styled from 'styled-components';
import '../components/styles/highlightStyles.css';
import "react-pdf-highlighter/dist/style.css";

// Keep the container absolutely positioned as required by the library
const PDFHighlighterContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f5f5f5;

  .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.2rem;
    color: #666;
  }

  .pdf-container {
    position: absolute !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }

  /* Ensure the PDF viewer is properly positioned */
  .PdfHighlighter {
    position: absolute !important;
    height: 100% !important;
    width: 100% !important;
  }
  
  .Highlight__popup {
    background-color: #3d4852;
    border-radius: 3px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    color: white;
    padding: 8px 12px;
    margin-top: 8px;
    max-width: 300px;
  }
`;

const Spinner = () => (
  <div className="loader bg-green-100">Loading PDF...</div>
);

// Popup component to show highlight comment
const HighlightPopup = ({ comment }: { comment: { text: string } }) => (
  comment?.text ? (
    <div className="Highlight__popup">
      {comment.text}
    </div>
  ) : null
);

interface PDFHighlighterProps {
  documentUrl: string;
  initialHighlights?: IHighlight[];
  onHighlightsChange?: (highlights: IHighlight[]) => void;
}

const getNextId = () => String(Math.random()).slice(2);


const createDefaultHighlight = (): IHighlight => {
  return {
    id: "default-highlight",
    content: {
      text: "Default highlighted area"
    },
    comment: {
      text: "This is the default highlighted area",
      emoji: "💡"
    },
    position: {
      boundingRect: {
        x1: 23.624998092651367,
        y1: 67.05714416503906,
        x2: 588.6015014648438,
        y2: 740.0321044921875,
        width: 588.6015014648438 - 23.624998092651367,
        height: 740.0321044921875 - 67.05714416503906,
        pageNumber: 1  // Note: pageNumber in Scaled interface is 1-indexed
      },
      rects: [{
        x1: 23.624998092651367,
        y1: 67.05714416503906,
        x2: 588.6015014648438,
        y2: 740.0321044921875,
        width: 588.6015014648438 - 23.624998092651367,
        height: 740.0321044921875 - 67.05714416503906,
        pageNumber: 1
      }],
      pageNumber: 1
    }
  };
};

const PDFHighlighterComponent: React.FC<PDFHighlighterProps> = ({ 
  documentUrl,
  initialHighlights = [],
  onHighlightsChange
}) => {
  const [highlights, setHighlights] = useState<IHighlight[]>(() => {
    return initialHighlights.length > 0 ? initialHighlights : [createDefaultHighlight()];
  });
  const scrollViewerTo = useRef<(highlight: IHighlight) => void>(() => {});

  useEffect(() => {
    if (onHighlightsChange) {
      onHighlightsChange(highlights);
    }
  }, [highlights, onHighlightsChange]);

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Adding highlight:", highlight);
    setHighlights(prevHighlights => [
      { ...highlight, id: getNextId() },
      ...prevHighlights
    ]);
  };

  

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>
  ) => {
    console.log("Updating highlight:", highlightId, position, content);
    setHighlights(prevHighlights =>
      prevHighlights.map(h => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest
            }
          : h;
      })
    );
  };

  return (
    <PDFHighlighterContainer>
      <div 
        className="pdf-container"
        style={{
          position: "absolute",
          height: "100%",
          width: "100%"
        }}
      >
        <PdfLoader url={documentUrl} beforeLoad={<Spinner />}>
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              pdfScaleValue="page-width"
              enableAreaSelection={(event) => event.altKey} // Hold Alt key to enable area selection
              highlights={highlights}
              onScrollChange={() => {}}
              scrollRef={(scrollTo) => {
                scrollViewerTo.current = scrollTo;
              }}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection,
                transformSelection
              ) => (
                <Tip
                  onOpen={transformSelection}
                  onConfirm={(comment) => {
                    addHighlight({ content, position, comment });
                    hideTipAndSelection();
                  }}
                />
              )}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                viewportToScaled,
                screenshot,
                isScrolledTo
              ) => {
                const isTextHighlight = !highlight.content?.image;

                const component = isTextHighlight ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={(boundingRect) => {
                      updateHighlight(
                        highlight.id,
                        { boundingRect: viewportToScaled(boundingRect) },
                        { image: screenshot(boundingRect) }
                      );
                    }}
                  />
                );

                return (
                  <Popup
                    popupContent={<HighlightPopup comment={highlight.comment} />}
                    onMouseOver={(popupContent) =>
                      setTip(highlight, () => popupContent)
                    }
                    onMouseOut={hideTip}
                    key={index}
                  >
                    {component}
                  </Popup>
                );
              }}
            />
          )}
        </PdfLoader>
      </div>
    </PDFHighlighterContainer>
  );
};

export default PDFHighlighterComponent;