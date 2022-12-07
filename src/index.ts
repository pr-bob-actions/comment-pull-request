import { getInput, setFailed } from "@actions/core";
import { getOctokit, context } from "@actions/github";

async function run() {
  const message: string = getInput("message");
  const token: string = getInput("github-token");
  const prNumber: string = getInput("pr-number");
  const commentTag: string = getInput("comment-tag");

  const octokit = getOctokit(token);

  const issueNumber =
    parseInt(prNumber) ||
    context.payload.pull_request?.number ||
    context.payload.issue?.number;

  if (!issueNumber) {
    setFailed("No issue/pull request in input neither in current context.");
    return;
  }

  const tagPattern = commentTag
    ? `<!-- pr-bob-actions/comment-pull-request tag: ${commentTag}`
    : undefined;
  const body = commentTag ? `${message}\n${tagPattern}` : message;

  let commentId: number | undefined;

  if (tagPattern) {
    try {
      const comments = (
        await octokit.rest.issues.listComments({
          ...context.repo,
          issue_number: issueNumber,
        })
      ).data;

      const comment = comments.find((c) => c.body?.includes(tagPattern));
      commentId = comment?.id;
    } catch (e) {
      e instanceof Error && setFailed("Unable to list comments: " + e.message);
      return;
    }
  }

  const opt = {
    ...context.repo,
    issue_number: issueNumber,
    body,
  };

  try {
    if (commentId) {
      octokit.rest.issues.updateComment({ ...opt, comment_id: commentId });
    } else {
      octokit.rest.issues.createComment({ ...opt });
    }
  } catch (e) {
    e instanceof Error &&
      setFailed("Unable to create/update comment: " + e.message);
    return;
  }
}

run();
