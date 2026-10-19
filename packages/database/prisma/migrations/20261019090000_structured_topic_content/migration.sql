ALTER TABLE "Topic" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Topic" ADD COLUMN "sourceFile" TEXT;

CREATE TYPE "ContentBlockType" AS ENUM ('HEADING', 'PARAGRAPH', 'BULLET_LIST', 'QUOTE', 'CASE', 'STATUTE', 'CITATION');

CREATE TABLE "TopicSection" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TopicSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopicContentBlock" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" "ContentBlockType" NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "citation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TopicContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TopicSection_topicId_position_key" ON "TopicSection"("topicId", "position");
CREATE UNIQUE INDEX "TopicContentBlock_sectionId_position_key" ON "TopicContentBlock"("sectionId", "position");

ALTER TABLE "TopicSection" ADD CONSTRAINT "TopicSection_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TopicContentBlock" ADD CONSTRAINT "TopicContentBlock_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TopicSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
