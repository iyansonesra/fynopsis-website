import React, { useRef, useEffect, useState, useCallback, memo } from "react";
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
import '../../../../components/styles/highlightStyles.css';
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
  <div className="loader">Loading PDF...</div>
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
  boundingBoxes: IHighlight[]; // Changed to IHighlight[] type
}

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pageNumber: number;
  text?: string; // Optional text for the highlight
  comment?: string; // Optional comment for the highlight
}

const getNextId = () => String(Math.random()).slice(2);
const getNextGroupId = () => `group-${String(Math.random()).slice(2)}`;



const boundingBoxToHighlight = (box: BoundingBox): IHighlight => {
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;

  return {
    id: getNextId(),
    content: {
      text: box.text || "Highlighted area"
    },
    comment: {
      text: box.comment || "",
      emoji: "🔍"
    },
    position: {
      boundingRect: {
        x1: box.x1,
        y1: box.y1,
        x2: box.x2,
        y2: box.y2,
        width,
        height,
        pageNumber: box.pageNumber
      },
      rects: [{
        x1: box.x1,
        y1: box.y1,
        x2: box.x2,
        y2: box.y2,
        width,
        height,
        pageNumber: box.pageNumber
      }],
      pageNumber: box.pageNumber
    }
  };
};

const PDFHighlighterComponentBase: React.FC<PDFHighlighterProps> = ({
  documentUrl,
  initialHighlights = [],
  onHighlightsChange,
  boundingBoxes
}) => {
  const [highlights, setHighlights] = useState<IHighlight[]>([
    ...boundingBoxes
  ]);

  const scrollViewerTo = useRef<(highlight: IHighlight) => void>(() => { });

  // Use a stable ref for the document URL to prevent unnecessary remounts
  const documentUrlRef = useRef(documentUrl);

  // Add the PDF component key to prevent re-creation of the root
  const pdfComponentKey = useRef(`pdf-${Math.random().toString(36).substring(2, 9)}`);
  useEffect(() => {
    // Log the bounding boxes when component initializes or when boundingBoxes change
    console.log("PDFHighlighterComponent - boundingBoxes:", boundingBoxes);
    console.log("PDFHighlighterComponent - initialHighlights:", initialHighlights);

    // You can also log the combined highlights if needed
    console.log("PDFHighlighterComponent - combined highlights:", [...initialHighlights, ...boundingBoxes]);

  }, [JSON.stringify(boundingBoxes), JSON.stringify(initialHighlights)]);

  // useEffect(() => {
  // }, [JSON.stringify(boundingBoxes), JSON.stringify(initialHighlights)]);

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Adding highlight:", highlight);
    setHighlights(prevHighlights => [
      { ...highlight, id: getNextId() },
      ...prevHighlights
    ]);
  };



  const [multiPageGroups, setMultiPageGroups] = useState<Record<string, string[]>>({});
  const currentDocument = useRef<any>(null);


  const highlightsSignatureRef = useRef("");

  // useEffect(() => {
  //   // Only trigger onHighlightsChange when the highlights actually change
  //   const newHighlightsSignature = JSON.stringify(highlights);
  //   console.log("HIGHLIGHTS CHANGED\n");
  //   if (onHighlightsChange && newHighlightsSignature !== highlightsSignatureRef.current) {
  //     highlightsSignatureRef.current = newHighlightsSignature;
  //     onHighlightsChange(highlights);
  //   }
  // }, [highlights, onHighlightsChange]);

  // Add a single highlight


  // Add a multi-page highlight
  const addMultiPageHighlight = (highlights: NewHighlight[]) => {
    if (!highlights.length) return;

    const groupId = getNextGroupId();
    const newHighlightIds: string[] = [];

    setHighlights(prevHighlights => {
      const newHighlights = highlights.map(h => {
        const id = getNextId();
        newHighlightIds.push(id);
        return { ...h, id };
      });

      return [...newHighlights, ...prevHighlights];
    });

    // Track the group of related highlights
    setMultiPageGroups(prev => ({
      ...prev,
      [groupId]: newHighlightIds
    }));
  };

  // Helper function to determine if selection spans multiple pages
  const isMultiPageSelection = (position: ScaledPosition) => {
    // Get the first and last rectangle in the selection
    if (!position.rects || position.rects.length < 2) return false;

    const firstRect = position.rects[0];
    const lastRect = position.rects[position.rects.length - 1];

    return firstRect.pageNumber !== lastRect.pageNumber;
  };

  // Split a multi-page selection into separate page highlights
  const splitMultiPageSelection = (position: ScaledPosition, content: Content) => {
    if (!position.rects || position.rects.length === 0) return [];

    // Group rects by page number
    const rectsByPage: Record<number, any[]> = {};

    position.rects.forEach(rect => {
      const pageNumber = rect.pageNumber || position.pageNumber;
      if (!rectsByPage[pageNumber]) {
        rectsByPage[pageNumber] = [];
      }
      rectsByPage[pageNumber].push(rect);
    });

    // Create a highlight for each page
    return Object.entries(rectsByPage).map(([pageNumber, rects]) => {
      const pageNum = parseInt(pageNumber);

      // Find bounding rect for this page's rects
      const boundingRect = rects.reduce((bounds, rect) => {
        return {
          x1: Math.min(bounds.x1, rect.x1),
          y1: Math.min(bounds.y1, rect.y1),
          x2: Math.max(bounds.x2, rect.x2),
          y2: Math.max(bounds.y2, rect.y2),
          width: 0,  // Will calculate after
          height: 0, // Will calculate after
          pageNumber: pageNum
        };
      }, {
        x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity,
        width: 0, height: 0, pageNumber: pageNum
      });

      // Calculate width and height
      boundingRect.width = boundingRect.x2 - boundingRect.x1;
      boundingRect.height = boundingRect.y2 - boundingRect.y1;

      return {
        position: {
          boundingRect,
          rects,
          pageNumber: pageNum
        },
        content,
        comment: content.text ? { text: content.text, emoji: "📝" } : { text: "", emoji: "📝" }
      } as NewHighlight;
    });
  };

  // Handle the finalized selection
  const handleSelectionFinished = (
    position: ScaledPosition,
    content: Content,
    hideTipAndSelection: () => void,
    transformSelection: () => void
  ) => {
    if (isMultiPageSelection(position)) {
      // For multi-page selections, we'll show a special UI
      const pageHighlights = splitMultiPageSelection(position, content);

      return (
        <Tip
          onOpen={transformSelection}
          onConfirm={(comment) => {
            // Apply the comment to all page highlights
            const highlightsWithComment = pageHighlights.map(h => ({
              ...h,
              comment
            }));

            addMultiPageHighlight(highlightsWithComment);
            hideTipAndSelection();
          }}
        />
      );
    }

    // Regular single-page highlight
    return (
      <Tip
        onOpen={transformSelection}
        onConfirm={(comment) => {
          addHighlight({ content, position, comment });
          hideTipAndSelection();
        }}
      />
    );
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
        <PdfLoader url={documentUrl}
          beforeLoad={<Spinner />}
          key={pdfComponentKey.current} // Add stable key to prevent multiple createRoot calls
        >
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              pdfScaleValue="page-width"
              enableAreaSelection={(event) => event.altKey} // Hold Alt key to enable area selection
              highlights={highlights}
              onScrollChange={() => { }}
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

const PDFHighlighterComponent = memo(PDFHighlighterComponentBase);
export default PDFHighlighterComponent;
